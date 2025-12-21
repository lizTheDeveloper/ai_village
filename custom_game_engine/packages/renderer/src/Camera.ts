/**
 * Camera for 2D world view.
 * Handles pan, zoom, and world-to-screen coordinate conversion.
 */
export class Camera {
  public x: number = 0; // World position
  public y: number = 0;
  public zoom: number = 1;

  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;

  private smoothing: number = 0.1; // Camera smoothing factor

  constructor(
    public viewportWidth: number,
    public viewportHeight: number
  ) {}

  /**
   * Set camera position (with smoothing).
   */
  setPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Set camera position immediately (no smoothing).
   */
  setPositionImmediate(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Set camera zoom (with smoothing).
   */
  setZoom(zoom: number): void {
    this.targetZoom = Math.max(0.1, Math.min(4, zoom));
  }

  /**
   * Pan the camera by screen pixels.
   */
  pan(dx: number, dy: number): void {
    this.targetX += dx / this.zoom;
    this.targetY += dy / this.zoom;
  }

  /**
   * Update camera (apply smoothing).
   */
  update(): void {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Get visible world bounds.
   */
  getVisibleBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } {
    const halfWidth = this.viewportWidth / (2 * this.zoom);
    const halfHeight = this.viewportHeight / (2 * this.zoom);

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    };
  }

  /**
   * Update viewport size.
   */
  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }
}
