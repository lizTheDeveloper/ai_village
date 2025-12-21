import { Camera } from './Camera.js';

/**
 * Handle keyboard and mouse input for camera control.
 */
export class InputHandler {
  private keys = new Set<string>();
  private mouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    // Mouse drag
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
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
