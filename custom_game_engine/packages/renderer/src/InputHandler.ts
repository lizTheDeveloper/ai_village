import { Camera } from './Camera.js';

export interface InputHandlerCallbacks {
  onKeyDown?: (key: string, shiftKey: boolean, ctrlKey: boolean) => boolean;
  onMouseClick?: (screenX: number, screenY: number, button: number) => boolean;
  onMouseMove?: (screenX: number, screenY: number) => void;
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

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera
  ) {
    this.setupEventListeners();
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
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.callbacks.onMouseClick?.(x, y, e.button)) {
        e.preventDefault();
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
      const rect = this.canvas.getBoundingClientRect();
      this.mouseMoveX = e.clientX - rect.left;
      this.mouseMoveY = e.clientY - rect.top;

      // Notify callback of mouse move
      this.callbacks.onMouseMove?.(this.mouseMoveX, this.mouseMoveY);

      if (this.mouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.camera.pan(-dx, -dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.setZoom(this.camera.zoom * zoomFactor);
    });
  }

  /**
   * Update camera based on input (call each frame).
   */
  update(): void {
    const panSpeed = 5;

    // Arrow keys or WASD
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      this.camera.pan(-panSpeed, 0);
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      this.camera.pan(panSpeed, 0);
    }
    if (this.keys.has('ArrowUp') || this.keys.has('w')) {
      this.camera.pan(0, -panSpeed);
    }
    if (this.keys.has('ArrowDown') || this.keys.has('s')) {
      this.camera.pan(0, panSpeed);
    }

    // Zoom with +/-
    if (this.keys.has('=') || this.keys.has('+')) {
      this.camera.setZoom(this.camera.zoom * 1.02);
    }
    if (this.keys.has('-') || this.keys.has('_')) {
      this.camera.setZoom(this.camera.zoom * 0.98);
    }
  }
}
