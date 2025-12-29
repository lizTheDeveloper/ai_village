import { Camera } from './Camera.js';
import type { CraftingPanelUI } from './CraftingPanelUI.js';

export interface InputHandlerCallbacks {
  onKeyDown?: (key: string, shiftKey: boolean, ctrlKey: boolean) => boolean;
  onMouseClick?: (screenX: number, screenY: number, button: number) => boolean;
  onMouseMove?: (screenX: number, screenY: number) => void;
  onWheel?: (screenX: number, screenY: number, deltaY: number) => boolean;
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

  constructor(
    canvasOrWorld: HTMLCanvasElement | any,
    camera?: Camera
  ) {
    if (camera) {
      // Old signature: (canvas, camera)
      this.canvas = canvasOrWorld;
      this.camera = camera;
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

  private setupEventListeners(): void {
    if (!this.canvas || !this.camera) {
      return; // Don't setup if canvas/camera not available
    }

    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Check if callback handles this key
      if (this.callbacks.onKeyDown?.(e.key, e.shiftKey, e.ctrlKey)) {
        e.preventDefault();
        return;
      }
      this.keys.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    // Mouse drag and click
    this.canvas.addEventListener('mousedown', (e) => {
      // Check if callback handles this click
      const rect = this.canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const handled = this.callbacks.onMouseClick?.(x, y, e.button);

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      this.mouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas!.getBoundingClientRect();
      this.mouseMoveX = e.clientX - rect.left;
      this.mouseMoveY = e.clientY - rect.top;

      // Notify callback of mouse move
      this.callbacks.onMouseMove?.(this.mouseMoveX, this.mouseMoveY);

      if (this.mouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.camera!.pan(-dx, -dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse wheel - first check callbacks, then zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Convert to canvas-relative coordinates (same as mousemove)
      const rect = this.canvas!.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // Let callbacks handle the wheel event first (e.g., window scrolling)
      if (this.callbacks.onWheel?.(canvasX, canvasY, e.deltaY)) {
        return;
      }

      // Default behavior: zoom camera
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera!.setZoom(this.camera!.zoom * zoomFactor);
    });
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

    // Arrow keys only (WASD reserved for game controls)
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

    // Zoom with +/-
    if (this.keys.has('=') || this.keys.has('+')) {
      this.camera!.setZoom(this.camera!.zoom * 1.02);
    }
    if (this.keys.has('-') || this.keys.has('_')) {
      this.camera!.setZoom(this.camera!.zoom * 0.98);
    }
  }
}
