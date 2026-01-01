/**
 * ContextMenuManager - Main context menu system
 *
 * Manages menu state, rendering, interactions, and lifecycle.
 */

import { EntityImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { EventBus } from '@ai-village/core';
import type { Camera } from './Camera.js';
import { MenuContext } from './context-menu/MenuContext.js';
import { ContextActionRegistry } from './context-menu/ContextActionRegistry.js';
import { ContextMenuRenderer } from './ContextMenuRenderer.js';
import type {
  RadialMenuItem,
  MenuState,
  VisualState,
  ItemRenderState,
  MenuStackEntry,
  RadialMenuConfig
} from './context-menu/types.js';
import { DEFAULT_RADIAL_MENU_CONFIG } from './context-menu/types.js';

/**
 * Manages the context menu system.
 */
export class ContextMenuManager {
  private world: World;
  private eventBus: EventBus;
  private camera: Camera;
  private canvas: HTMLCanvasElement;

  private registry: ContextActionRegistry;
  private renderer: ContextMenuRenderer;

  private config: RadialMenuConfig;
  private state: MenuState;
  private visualState: VisualState;

  private menuStack: MenuStackEntry[] = [];
  private currentItems: RadialMenuItem[] = [];
  private menuId: string = '';

  private eventListeners: Array<{ event: string; handler: (...args: any[]) => void }> = [];

  // Hover position for context-aware shortcuts
  private hoverWorldX: number = 0;
  private hoverWorldY: number = 0;

  // Animation state
  private animationStartTime: number = 0;

  // Cleanup timeout ID (to cancel pending cleanup when reopening)
  private cleanupTimeoutId: number | null = null;

  constructor(
    world: World,
    eventBus: EventBus,
    camera: Camera,
    canvas: HTMLCanvasElement
  ) {
    console.log('[ContextMenuManager] Constructor called');

    if (!world) {
      throw new Error('ContextMenuManager requires valid world');
    }
    if (!eventBus) {
      throw new Error('ContextMenuManager requires valid eventBus');
    }
    if (!camera) {
      throw new Error('ContextMenuManager requires valid camera');
    }
    if (!canvas) {
      throw new Error('ContextMenuManager requires valid canvas');
    }

    this.world = world;
    this.eventBus = eventBus;
    this.camera = camera;
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('ContextMenuManager requires valid canvas 2d context');
    }

    console.log('[ContextMenuManager] Creating ContextActionRegistry...');
    this.registry = new ContextActionRegistry(world, eventBus);
    console.log('[ContextMenuManager] Creating ContextMenuRenderer...');
    this.renderer = new ContextMenuRenderer(ctx);

    this.config = { ...DEFAULT_RADIAL_MENU_CONFIG };

    this.state = {
      isOpen: false,
      position: { x: 0, y: 0 },
      context: null,
      hoveredItemId: null,
      hoverScale: 1.0,
      hoverBrightness: 1.0,
      menuLevel: 0,
      animationProgress: 0,
      isAnimating: false
    };

    this.visualState = {
      showConnectorLine: false,
      connectorTarget: null,
      cursor: 'default'
    };

    console.log('[ContextMenuManager] Setting up event listeners...');
    this.setupEventListeners();
    console.log('[ContextMenuManager] Constructor complete - ContextMenuManager ready');
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Open the context menu at screen coordinates.
   */
  public open(screenX: number, screenY: number): void {
    console.log(`[ContextMenuManager] open() called at screen (${screenX}, ${screenY})`);

    try {
      // Close existing menu if open (which will schedule cleanup)
      if (this.state.isOpen) {
        console.log('[ContextMenuManager] Closing existing menu before opening new one');
        this.close();
      }

      // Cancel any pending cleanup from previous menu (including the one we just scheduled)
      if (this.cleanupTimeoutId !== null) {
        console.log('[ContextMenuManager] Cancelling pending cleanup timeout');
        clearTimeout(this.cleanupTimeoutId);
        this.cleanupTimeoutId = null;
      }

      // Adjust position for screen boundaries
      // Use logical canvas dimensions (getBoundingClientRect), not physical (canvas.width/height)
      // because input coordinates are in logical space
      const rect = this.canvas.getBoundingClientRect();
      console.log(`[ContextMenuManager] Canvas dimensions: ${rect.width}x${rect.height}`);

      const adjustedPos = this.renderer.adjustPositionForScreen(
        screenX,
        screenY,
        this.config.outerRadius,
        rect.width,
        rect.height
      );
      console.log(`[ContextMenuManager] Adjusted position: (${adjustedPos.x}, ${adjustedPos.y})`);

      // Create context
      console.log('[ContextMenuManager] Creating MenuContext from click...');
      const context = MenuContext.fromClick(this.world, this.camera, screenX, screenY);
      console.log(`[ContextMenuManager] Context created: targetType=${context.targetType}, hasSelection=${context.hasSelection()}`);

      // Get applicable actions
      console.log('[ContextMenuManager] Getting applicable actions from registry...');
      const applicableActions = this.registry.getApplicableActions(context);
      console.log(`[ContextMenuManager] Found ${applicableActions.length} applicable actions:`, applicableActions.map(a => a.label).join(', '));

      // Convert to menu items
      const items = this.actionsToMenuItems(applicableActions, context);
      console.log(`[ContextMenuManager] Converted to ${items.length} menu items`);

      // Don't open menu if there are no items
      if (items.length === 0) {
        console.warn('[ContextMenuManager] No items to display - menu will not open');
        return;
      }

    // Calculate arc angles
    console.log('[ContextMenuManager] Calculating arc angles...');
    const itemsWithAngles = this.renderer.calculateArcAngles(
      items,
      this.config.innerRadius,
      this.config.outerRadius,
      this.config.itemGap
    );
    console.log(`[ContextMenuManager] Arc angles calculated for ${itemsWithAngles.length} items`);

    // Update state
    this.state = {
      isOpen: true,
      position: adjustedPos,
      context,
      hoveredItemId: null,
      hoverScale: this.config.hoverScale,
      hoverBrightness: this.config.hoverBrightness,
      menuLevel: 0,
      animationProgress: 0,
      isAnimating: true
    };
    console.log('[ContextMenuManager] State updated: isOpen=true, isAnimating=true');

    this.currentItems = itemsWithAngles;
    this.menuStack = [
      {
        parentId: null,
        items: itemsWithAngles,
        position: adjustedPos
      }
    ];

    this.menuId = `menu_${Date.now()}`;

    // Show connector line if there's a target entity
    if (context.targetEntity) {
      this.visualState.showConnectorLine = true;
      this.visualState.connectorTarget = adjustedPos;
      console.log('[ContextMenuManager] Connector line enabled for target entity');
    } else {
      this.visualState.showConnectorLine = false;
      this.visualState.connectorTarget = null;
    }

    // Start animation
    this.animationStartTime = Date.now();

    // Emit opened event
    this.eventBus.emit({
      type: 'ui:contextmenu:opened',
      source: 'world',
      data: { position: adjustedPos, context }
    });
    console.log('[ContextMenuManager] Emitted ui:contextmenu:opened event');

    // Emit animation start event
    this.eventBus.emit({
      type: 'ui:contextmenu:animation_start',
      source: 'world',
      data: { type: 'open', style: this.config.openAnimation }
    });
    console.log(`[ContextMenuManager] Emitted ui:contextmenu:animation_start event (style: ${this.config.openAnimation})`);
    console.log('[ContextMenuManager] open() complete - menu should render on next frame');
    } catch (error) {
      console.error('[ContextMenuManager] Error during open:', error);
      throw error;
    }
  }

  /**
   * Close the context menu.
   */
  public close(): void {
    if (!this.state.isOpen) {
      return;
    }

    // Close immediately (don't wait for animation)
    this.state.isOpen = false;

    // Start close animation
    this.state.isAnimating = true;
    this.animationStartTime = Date.now();

    // Emit animation start event
    this.eventBus.emit({
      type: 'ui:contextmenu:animation_start',
      source: 'world',
      data: { type: 'close', style: this.config.closeAnimation }
    });

    // Schedule cleanup after animation
    // NOTE: Don't clear context here - it's needed for confirmation dialogs
    this.cleanupTimeoutId = setTimeout(() => {
      this.state.hoveredItemId = null;
      this.currentItems = [];
      this.menuStack = [];
      this.visualState.showConnectorLine = false;
      this.visualState.cursor = 'default';

      // Don't clean up event listeners - keep them active for confirmation handlers

      // Emit closed event
      this.eventBus.emit({ type: 'ui:contextmenu:closed', source: 'world', data: {} });

      this.cleanupTimeoutId = null;
    }, this.config.animationDuration) as unknown as number;
  }

  /**
   * Check if menu is currently open.
   */
  public isOpen(): boolean {
    return this.state.isOpen;
  }

  /**
   * Get current menu state.
   */
  public getState(): MenuState {
    return { ...this.state };
  }

  /**
   * Get current context.
   */
  public getContext(): MenuContext | null {
    return this.state.context;
  }

  /**
   * Get visible menu items.
   */
  public getVisibleItems(): RadialMenuItem[] {
    return this.currentItems;
  }

  /**
   * Get menu configuration.
   */
  public getConfig(): RadialMenuConfig {
    return { ...this.config };
  }

  /**
   * Get menu ID.
   */
  public getMenuId(): string {
    return this.menuId;
  }

  /**
   * Get current menu level.
   */
  public getCurrentMenuLevel(): number {
    return this.state.menuLevel;
  }

  /**
   * Get menu stack.
   */
  public getMenuStack(): MenuStackEntry[] {
    return [...this.menuStack];
  }

  /**
   * Get visual state.
   */
  public getVisualState(): VisualState {
    return { ...this.visualState };
  }

  /**
   * Get current cursor style.
   */
  public getCursor(): string {
    return this.visualState.cursor;
  }

  /**
   * Get render state for an item.
   */
  public getItemRenderState(itemId: string): ItemRenderState {
    const item = this.currentItems.find(i => i.id === itemId);
    if (!item) {
      return {
        opacity: 1.0,
        scale: 1.0,
        brightness: 1.0,
        selecting: false
      };
    }

    return {
      opacity: item.enabled ? 1.0 : this.config.disabledOpacity,
      scale: item.hovered ? this.config.hoverScale : 1.0,
      brightness: item.hovered ? this.config.hoverBrightness : 1.0,
      selecting: false
    };
  }

  /**
   * Get active event listener count (for testing cleanup).
   */
  public getActiveListenerCount(): number {
    return this.eventListeners.length;
  }

  // ============================================================================
  // User Interactions
  // ============================================================================

  /**
   * Handle mouse move over menu.
   */
  public handleMouseMove(screenX: number, screenY: number): void {
    if (!this.state.isOpen) return;

    const hitItemId = this.renderer.hitTest(
      this.currentItems,
      this.state.position.x,
      this.state.position.y,
      screenX,
      screenY
    );

    // Update hover state
    this.state.hoveredItemId = hitItemId;

    // Update item hover flags
    for (const item of this.currentItems) {
      item.hovered = item.id === hitItemId;
    }

    // Update cursor
    if (hitItemId) {
      const item = this.currentItems.find(i => i.id === hitItemId);
      this.visualState.cursor = item?.enabled ? 'pointer' : 'not-allowed';
    } else {
      this.visualState.cursor = 'default';
    }
  }

  /**
   * Handle click on menu.
   */
  public handleClick(screenX: number, screenY: number): void {
    if (!this.state.isOpen) return;

    const hitItemId = this.renderer.hitTest(
      this.currentItems,
      this.state.position.x,
      this.state.position.y,
      screenX,
      screenY
    );

    if (hitItemId) {
      this.executeAction(hitItemId);
    } else {
      // Clicked outside menu - close
      this.close();
    }
  }

  /**
   * Handle key press.
   */
  public handleKeyPress(key: string): void {
    if (!this.state.isOpen) return;

    if (key.toLowerCase() === 'escape') {
      this.close();
      return;
    }

    // Check for shortcut
    const item = this.currentItems.find(
      i => i.shortcut && i.shortcut.toLowerCase() === key.toLowerCase()
    );

    if (item) {
      this.executeAction(item.id);
    }
  }

  /**
   * Handle shortcut key press (without menu open).
   */
  public handleShortcut(key: string): void {
    // Create context from hover position
    const screenPos = this.camera.worldToScreenSimple(this.hoverWorldX, this.hoverWorldY);
    const context = MenuContext.fromClick(this.world, this.camera, screenPos.x, screenPos.y);

    // Find applicable action with this shortcut
    const actions = this.registry.getApplicableActions(context);
    const action = actions.find(a => a.shortcut && a.shortcut.toLowerCase() === key.toLowerCase());

    if (action) {
      this.registry.execute(action.id, context);
    }
  }

  /**
   * Set hover position for context-aware shortcuts.
   */
  public setHoverPosition(worldX: number, worldY: number): void {
    this.hoverWorldX = worldX;
    this.hoverWorldY = worldY;
  }

  /**
   * Hover over an item (for submenu opening).
   */
  public hoverItem(itemId: string): void {
    this.state.hoveredItemId = itemId;

    for (const item of this.currentItems) {
      item.hovered = item.id === itemId;
    }
  }

  /**
   * Get submenu items for a parent item.
   */
  public getSubmenuItems(parentId: string): RadialMenuItem[] | null {
    const parentItem = this.currentItems.find(i => i.id === parentId);
    if (!parentItem || !parentItem.submenu) return null;

    // Convert submenu to menu items
    const context = this.state.context;
    if (!context) return null;

    // Convert submenu actions to menu items
    const submenuItems = this.actionsToMenuItems(parentItem.submenu, context);

    const itemsWithAngles = this.renderer.calculateArcAngles(
      submenuItems,
      this.config.innerRadius,
      this.config.outerRadius,
      this.config.itemGap
    );

    // Add submenu items to currentItems so they can be executed
    for (const item of itemsWithAngles) {
      if (!this.currentItems.find(i => i.id === item.id)) {
        this.currentItems.push(item);
      }
    }

    return itemsWithAngles;
  }

  /**
   * Navigate back to parent menu.
   */
  public navigateBack(): void {
    if (this.menuStack.length <= 1) return;

    this.menuStack.pop();
    const parentLevel = this.menuStack[this.menuStack.length - 1];

    if (parentLevel) {
      this.currentItems = parentLevel.items;
      this.state.menuLevel = this.menuStack.length - 1;
    }
  }

  /**
   * Execute action by item ID.
   */
  public executeAction(itemId: string): void {
    const item = this.currentItems.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Cannot execute action for non-existent item: ${itemId}`);
    }

    if (!item.enabled) return;

    const context = this.state.context;
    if (!context) return;

    // Emit action selected event
    this.eventBus.emit({
      type: 'ui:contextmenu:action_selected',
      source: 'world',
      data: { actionId: item.actionId, itemId, context }
    });

    // Check if action requires confirmation
    if (item.requiresConfirmation) {
      this.eventBus.emit({
        type: 'ui:confirmation:show',
        source: 'world',
        data: {
          actionId: item.actionId,
          message: item.confirmationMessage || 'Are you sure?',
          consequences: item.consequences || [],
          context: context // Include context for confirmation handler
        }
      });

      this.close();
      return;
    }

    // Execute action
    try {
      this.registry.execute(item.actionId, context);

      // Emit success event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: { actionId: item.actionId, success: true }
      });

      this.close();
    } catch (error) {
      // Emit failure event
      this.eventBus.emit({
        type: 'ui:contextmenu:action_executed',
        source: 'world',
        data: { actionId: item.actionId, success: false, error: String(error) }
      });

      console.error(`[ContextMenuManager] Failed to execute action ${item.actionId}:`, error);
      this.close();
      throw error;
    }
  }

  /**
   * Select action (with animation).
   */
  public selectAction(itemId: string): void {
    this.eventBus.emit({
      type: 'ui:contextmenu:action_selected',
      source: 'world',
      data: { itemId, context: this.state.context }
    });

    this.executeAction(itemId);
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  /**
   * Update and render menu (call each frame).
   */
  public update(): void {
    // Don't render if menu is closed AND not animating
    if (!this.state.isOpen && !this.state.isAnimating) {
      return;
    }

    // Update animation
    if (this.state.isAnimating) {
      const elapsed = Date.now() - this.animationStartTime;
      const progress = Math.min(elapsed / this.config.animationDuration, 1.0);

      this.state.animationProgress = progress;

      if (progress >= 1.0) {
        this.state.isAnimating = false;
      }
    }

    // NOTE: Don't call render() here - it's called separately by main.ts
    // this.render();
  }

  /**
   * Render the menu (called by main Renderer).
   */
  public render(): void {
    console.log(`[ContextMenuManager] render() called - isOpen=${this.state.isOpen}, isAnimating=${this.state.isAnimating}, currentItems=${this.currentItems.length}`);

    if (!this.state.isOpen && !this.state.isAnimating) {
      return;
    }

    console.log(`[ContextMenuManager] Rendering menu at position (${this.state.position.x}, ${this.state.position.y})`);

    // Render connector line if enabled
    if (this.visualState.showConnectorLine && this.visualState.connectorTarget) {
      this.renderer.renderConnectorLine(
        this.state.position.x,
        this.state.position.y,
        this.visualState.connectorTarget.x,
        this.visualState.connectorTarget.y
      );
    }

    // Render menu with animation if needed
    if (this.state.isAnimating) {
      // Determine if opening or closing based on state.isOpen
      if (this.state.isOpen) {
        // Opening animation
        console.log('[ContextMenuManager] Rendering with OPEN animation');
        this.renderer.renderOpenAnimation(
          this.currentItems,
          this.state.position.x,
          this.state.position.y,
          this.config.openAnimation,
          this.state.animationProgress
        );
      } else {
        // Closing animation
        console.log('[ContextMenuManager] Rendering with CLOSE animation');
        this.renderer.renderCloseAnimation(
          this.currentItems,
          this.state.position.x,
          this.state.position.y,
          this.config.closeAnimation,
          this.state.animationProgress
        );
      }
    } else if (this.state.isOpen) {
      // Static render (only if open)
      console.log('[ContextMenuManager] Rendering STATIC menu');
      this.renderer.render(
        this.currentItems,
        this.state.position.x,
        this.state.position.y
      );
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Convert actions to menu items.
   */
  private actionsToMenuItems(
    actions: any[],
    context: MenuContext
  ): RadialMenuItem[] {
    return actions.map((action, index) => {
      // Check if action is enabled based on context
      let isEnabled = true;

      // Additional context-specific checks
      if (action.id === 'enter') {
        const building = context.getTargetEntity(this.world);
        const buildingComp = building ? (building as EntityImpl).getComponent('building') as any : undefined;
        isEnabled = buildingComp?.canEnter === true && buildingComp?.locked !== true;
      } else if (action.id === 'repair') {
        const building = context.getTargetEntity(this.world);
        const buildingComp = building ? (building as EntityImpl).getComponent('building') as any : undefined;
        isEnabled = buildingComp && buildingComp.health < 1.0;
      } else if (action.id === 'harvest') {
        const resource = context.getTargetEntity(this.world);
        const harvestable = resource ? (resource as EntityImpl).getComponent('harvestable') as any : undefined;
        isEnabled = harvestable && harvestable.amount > 0;
      } else if (action.id === 'follow') {
        isEnabled = context.hasSelection();
      } else if (action.id === 'assign_worker') {
        isEnabled = context.hasSelection();
      }

      return {
        id: `item_${index}_${action.id}`,
        label: action.label,
        actionId: action.id,
        icon: action.icon,
        shortcut: action.shortcut,
        enabled: isEnabled,
        hasSubmenu: action.hasSubmenu ?? false,
        submenu: action.submenu,
        requiresConfirmation: action.requiresConfirmation ?? false,
        confirmationMessage: action.confirmationMessage,
        consequences: action.consequences,
        submenuIndicator: action.hasSubmenu ? '›' : undefined
      };
    });
  }

  /**
   * Setup event listeners.
   */
  private setupEventListeners(): void {
    // Listen for right-click events
    const rightClickHandler = (event: { data: { x: number; y: number } }) => {
      console.log('[ContextMenuManager] Received input:rightclick event:', event);
      try {
        if (event.data && typeof event.data.x === 'number' && typeof event.data.y === 'number') {
          console.log(`[ContextMenuManager] Valid right-click at (${event.data.x}, ${event.data.y})`);
          this.open(event.data.x, event.data.y);
        } else {
          console.error('[ContextMenuManager] Invalid event data:', event.data);
        }
      } catch (error) {
        console.error('[ContextMenuManager] Exception in rightClickHandler:', error);
      }
    };

    this.eventBus.on('input:rightclick', rightClickHandler);
    this.eventListeners.push({ event: 'input:rightclick', handler: rightClickHandler });
    console.log('[ContextMenuManager] Registered listener for input:rightclick events');

    // Listen for confirmation results
    const confirmHandler = (event: any) => {
      // Validate event structure
      if (!event?.data?.actionId) {
        return;
      }
      if (!event.data.context) {
        return;
      }
      // Re-execute action after confirmation
      this.registry.execute(event.data.actionId, event.data.context as MenuContext);
    };

    this.eventBus.on('ui:confirmation:confirmed', confirmHandler);
    this.eventListeners.push({ event: 'ui:confirmation:confirmed', handler: confirmHandler });
  }

  /**
   * Clean up event listeners.
   */
  private cleanupEventListeners(): void {
    for (const { event, handler } of this.eventListeners) {
      this.eventBus.off(event as any, handler);
    }
    this.eventListeners = [];
  }

  /**
   * Destroy the context menu manager and clean up resources.
   * Call this when removing the manager from the game.
   */
  public destroy(): void {
    if (this.state.isOpen) {
      this.close();
    }
    this.cleanupEventListeners();
  }
}
