import { Camera, ViewMode } from './Camera.js';
import type { CraftingPanelUI } from './CraftingPanelUI.js';

// ============================================================================
// Enums
// ============================================================================

/**
 * Input action types for unified handling.
 */
export enum InputAction {
  /** Pan camera in a direction */
  PanCamera = 'pan_camera',
  /** Zoom camera in/out */
  ZoomCamera = 'zoom_camera',
  /** Adjust Z-depth in side-view */
  AdjustDepth = 'adjust_depth',
  /** Toggle view mode */
  ToggleViewMode = 'toggle_view_mode',
  /** Reset camera position */
  ResetCamera = 'reset_camera',
  /** Reset Z-depth to surface */
  ResetDepth = 'reset_depth',
}

/**
 * Mouse button types.
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

/**
 * Scroll direction.
 */
export enum ScrollDirection {
  Up = 'up',
  Down = 'down',
}

// ============================================================================
// Interfaces
// ============================================================================

export interface InputHandlerCallbacks {
  onKeyDown?: (key: string, shiftKey: boolean, ctrlKey: boolean) => boolean;
  onMouseClick?: (screenX: number, screenY: number, button: number) => boolean;
  onMouseMove?: (screenX: number, screenY: number) => void;
  onWheel?: (screenX: number, screenY: number, deltaY: number) => boolean;
  onRightClick?: (screenX: number, screenY: number) => void;
  /** Called when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Called when z-depth changes in side-view */
  onDepthChange?: (z: number) => void;
}

/** Stores bound event listener for cleanup */
interface BoundHandler {
  element: EventTarget;
  event: string;
  handler: EventListener;
}

/**
 * Handle keyboard and mouse input for camera control.
 */
export class InputHandler {
  private keys = new Set<string>();
  private mouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private callbacks: InputHandlerCallbacks = {};
  private mouseMoveX = 0;
  private mouseMoveY = 0;
  private craftingPanel: CraftingPanelUI | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private camera: Camera | null = null;
  private boundHandlers: BoundHandler[] = [];

  constructor(
    canvasOrWorld: HTMLCanvasElement | any,
    camera?: Camera
  ) {
    // Per CLAUDE.md: no silent fallbacks - validate inputs
    if (canvasOrWorld === null || canvasOrWorld === undefined) {
      throw new Error('InputHandler requires a valid canvas or world');
    }

    if (camera) {
      // Old signature: (canvas, camera)
      // Validate canvas
      if (!(canvasOrWorld instanceof HTMLCanvasElement)) {
        throw new Error('InputHandler requires a valid HTMLCanvasElement');
      }
      this.canvas = canvasOrWorld;
      this.camera = camera;
      this.setupEventListeners();
    } else if (canvasOrWorld instanceof HTMLCanvasElement) {
      // Canvas-only signature - set up listeners without camera
      this.canvas = canvasOrWorld;
      this.setupEventListeners();
    } else {
      // New signature: (world) - for testing
      // Don't setup event listeners, just store world
    }
  }

  /**
   * Register crafting panel for keyboard shortcut handling.
   */
  registerCraftingPanel(panel: CraftingPanelUI): void {
    this.craftingPanel = panel;
  }

  /**
   * Handle keyboard event (for testing and explicit handling).
   */
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const shiftKey = event.shiftKey;

    // Handle crafting panel shortcuts
    if (this.craftingPanel) {
      // Toggle panel with 'C' (but not Cmd+C or Ctrl+C)
      if (key === 'c' && !event.metaKey && !event.ctrlKey) {
        this.craftingPanel.toggle();
        event.preventDefault();
        return;
      }

      // Close panel with Escape
      if (key === 'escape' && this.craftingPanel.isVisible) {
        this.craftingPanel.hide();
        event.preventDefault();
        return;
      }

      // Only handle these if panel is visible
      if (this.craftingPanel.isVisible) {
        // Tab navigation
        if (key === 'tab') {
          this.craftingPanel.focusedSection =
            this.craftingPanel.focusedSection === 'recipeList' ? 'queue' : 'recipeList';
          event.preventDefault();
          return;
        }

        // Arrow navigation
        if (key === 'arrowdown' && this.craftingPanel.focusedSection === 'recipeList') {
          const maxIndex = this.craftingPanel.recipeListSection.getRecipeCount() - 1;
          this.craftingPanel.recipeListSection.selectedIndex =
            Math.min(maxIndex, this.craftingPanel.recipeListSection.selectedIndex + 1);
          event.preventDefault();
          return;
        }

        if (key === 'arrowup' && this.craftingPanel.focusedSection === 'recipeList') {
          this.craftingPanel.recipeListSection.selectedIndex =
            Math.max(0, this.craftingPanel.recipeListSection.selectedIndex - 1);
          event.preventDefault();
          return;
        }

        // Enter to select/craft
        if (key === 'enter') {
          if (shiftKey) {
            // Add to queue
            event.preventDefault();
            return;
          } else {
            // Craft now or select recipe
            event.preventDefault();
            return;
          }
        }
      }
    }
  }

  /**
   * Set callbacks for input events.
   * Callbacks return true if the event was handled and should not propagate.
   */
  setCallbacks(callbacks: InputHandlerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current mouse position on canvas.
   */
  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseMoveX, y: this.mouseMoveY };
  }

  /**
   * Helper to add event listener and track it for cleanup.
   */
  private addListener(element: EventTarget, event: string, handler: EventListener): void {
    element.addEventListener(event, handler);
    this.boundHandlers.push({ element, event, handler });
  }

  private setupEventListeners(): void {
    if (!this.canvas) {
      return; // Don't setup if canvas not available
    }

    // Keyboard
    const handleKeyDown = (e: Event) => {
      const ke = e as KeyboardEvent;
      // Check if callback handles this key
      if (this.callbacks.onKeyDown?.(ke.key, ke.shiftKey, ke.ctrlKey)) {
        ke.preventDefault();
        return;
      }
      this.keys.add(ke.key);
    };
    this.addListener(window, 'keydown', handleKeyDown);

    const handleKeyUp = (e: Event) => {
      const ke = e as KeyboardEvent;
      this.keys.delete(ke.key);
    };
    this.addListener(window, 'keyup', handleKeyUp);

    // Mouse drag and click
    const handleMouseDown = (e: Event) => {
      const me = e as MouseEvent;
      // Check if callback handles this click
      const rect = this.canvas!.getBoundingClientRect();
      const x = me.clientX - rect.left;
      const y = me.clientY - rect.top;

      // Handle right-click (button 2) for context menu
      if (me.button === 2 && this.callbacks.onRightClick) {
        me.preventDefault();
        this.callbacks.onRightClick(x, y);
        return;
      }

      const handled = this.callbacks.onMouseClick?.(x, y, me.button);

      if (handled) {
        me.preventDefault();
        me.stopPropagation();
        me.stopImmediatePropagation();
        return;
      }

      this.mouseDown = true;
      this.lastMouseX = me.clientX;
      this.lastMouseY = me.clientY;
    };
    this.addListener(this.canvas, 'mousedown', handleMouseDown);

    // Handle right-click for context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      const me = e as MouseEvent;
      const rect = this.canvas!.getBoundingClientRect();
      const screenX = me.clientX - rect.left;
      const screenY = me.clientY - rect.top;

      // Call onRightClick callback if registered
      if (this.callbacks.onRightClick) {
        this.callbacks.onRightClick(screenX, screenY);
      }
    };
    this.addListener(this.canvas, 'contextmenu', handleContextMenu);

    const handleMouseUp = () => {
      this.mouseDown = false;
    };
    this.addListener(window, 'mouseup', handleMouseUp);

    const handleMouseMove = (e: Event) => {
      const me = e as MouseEvent;
      const rect = this.canvas!.getBoundingClientRect();
      this.mouseMoveX = me.clientX - rect.left;
      this.mouseMoveY = me.clientY - rect.top;

      // Notify callback of mouse move
      this.callbacks.onMouseMove?.(this.mouseMoveX, this.mouseMoveY);

      if (this.mouseDown) {
        const dx = me.clientX - this.lastMouseX;
        const dy = me.clientY - this.lastMouseY;
        this.camera?.pan(-dx, -dy);
        this.lastMouseX = me.clientX;
        this.lastMouseY = me.clientY;
      }
    };
    this.addListener(window, 'mousemove', handleMouseMove);

    // Mouse wheel - zoom or depth change
    const handleWheel = (e: Event) => {
      const we = e as WheelEvent;
      we.preventDefault();

      // Convert to canvas-relative coordinates (same as mousemove)
      const rect = this.canvas!.getBoundingClientRect();
      const canvasX = we.clientX - rect.left;
      const canvasY = we.clientY - rect.top;

      // Let callbacks handle the wheel event first (e.g., window scrolling)
      if (this.callbacks.onWheel?.(canvasX, canvasY, we.deltaY)) {
        return;
      }

      // Camera operations only when camera is available
      if (this.camera) {
        // Shift + scroll = change depth slice (Y position for which row we're viewing)
        if (we.shiftKey) {
          // Scroll up = move forward (into screen), scroll down = move back
          const delta = we.deltaY > 0 ? 1 : -1;
          this.camera.adjustDepthSlice(delta);
          this.callbacks.onDepthChange?.(this.camera.y);
        } else {
          // Regular scroll = zoom (both modes)
          const zoomFactor = we.deltaY > 0 ? 0.9 : 1.1;
          this.camera.setZoom(this.camera.zoom * zoomFactor);
        }
      }
    };
    this.addListener(this.canvas, 'wheel', handleWheel);
  }

  // ==========================================================================
  // View Mode Control
  // ==========================================================================

  /**
   * Toggle between view modes.
   * Call this from keyboard handler (V key).
   */
  toggleViewMode(): ViewMode {
    if (!this.camera) return ViewMode.TopDown;
    const newMode = this.camera.toggleViewMode();
    this.callbacks.onViewModeChange?.(newMode);
    return newMode;
  }

  /**
   * Set specific view mode.
   */
  setViewMode(mode: ViewMode): void {
    if (!this.camera) return;
    this.camera.setViewMode(mode);
    this.callbacks.onViewModeChange?.(mode);
  }

  /**
   * Get current view mode.
   */
  getViewMode(): ViewMode {
    return this.camera?.viewMode ?? ViewMode.TopDown;
  }

  /**
   * Reset z-depth to surface level.
   */
  resetDepth(): void {
    if (!this.camera) return;
    this.camera.resetFocusDepth();
    this.callbacks.onDepthChange?.(0);
  }

  /**
   * Remove all event listeners and clean up resources.
   * Call this when the InputHandler is no longer needed.
   */
  destroy(): void {
    for (const { element, event, handler } of this.boundHandlers) {
      element.removeEventListener(event, handler);
    }
    this.boundHandlers = [];
    this.keys.clear();
    this.callbacks = {};
    this.craftingPanel = null;
  }

  /**
   * Update camera based on input (call each frame).
   */
  update(): void {
    // Camera can be null during initialization
    if (!this.camera) {
      return;
    }

    const panSpeed = 5;

    // Arrow keys behavior depends on view mode
    if (this.camera.isSideView()) {
      // Side-view mode:
      // Left/Right = pan horizontally (X axis)
      // Up/Down = scroll vertically (look up at mountains, down at caves)
      if (this.keys.has('ArrowLeft')) {
        this.camera!.pan(-panSpeed, 0);
      }
      if (this.keys.has('ArrowRight')) {
        this.camera!.pan(panSpeed, 0);
      }
      if (this.keys.has('ArrowUp')) {
        this.camera!.panSideViewVertical(panSpeed); // Look up
      }
      if (this.keys.has('ArrowDown')) {
        this.camera!.panSideViewVertical(-panSpeed); // Look down
      }
    } else {
      // Top-down mode: normal panning
      if (this.keys.has('ArrowLeft')) {
        this.camera!.pan(-panSpeed, 0);
      }
      if (this.keys.has('ArrowRight')) {
        this.camera!.pan(panSpeed, 0);
      }
      if (this.keys.has('ArrowUp')) {
        this.camera!.pan(0, -panSpeed);
      }
      if (this.keys.has('ArrowDown')) {
        this.camera!.pan(0, panSpeed);
      }
    }

    // Zoom with +/- (only in top-down mode)
    if (!this.camera.isSideView()) {
      if (this.keys.has('=') || this.keys.has('+')) {
        this.camera!.setZoom(this.camera!.zoom * 1.02);
      }
      if (this.keys.has('-') || this.keys.has('_')) {
        this.camera!.setZoom(this.camera!.zoom * 0.98);
      }
    }

    // Z-depth adjustment with [ and ] keys (any mode, but mainly for side-view)
    if (this.keys.has('[')) {
      this.camera!.adjustFocusDepth(-0.5); // Move closer (decrease z)
      this.callbacks.onDepthChange?.(this.camera!.z);
    }
    if (this.keys.has(']')) {
      this.camera!.adjustFocusDepth(0.5); // Move further (increase z)
      this.callbacks.onDepthChange?.(this.camera!.z);
    }

    // Reset z-depth with 0 key
    if (this.keys.has('0') && this.camera.isSideView()) {
      this.resetDepth();
    }
  }

  /**
   * Check if V key was pressed this frame (for view mode toggle).
   * Call this from main loop and clear the key.
   */
  checkViewModeToggle(): boolean {
    if (this.keys.has('v') || this.keys.has('V')) {
      this.keys.delete('v');
      this.keys.delete('V');
      return true;
    }
    return false;
  }
}

// Re-export ViewMode for convenience
export { ViewMode };
