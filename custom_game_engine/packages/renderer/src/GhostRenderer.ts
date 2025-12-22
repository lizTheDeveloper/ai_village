/**
 * GhostRenderer - Renders translucent building ghost previews during placement.
 *
 * Implements: REQ-BPLACE-002 (Ghost Preview)
 *
 * Visual specification from spec:
 * - Opacity: 0.6 (60% transparent)
 * - Valid Color: Green tint rgba(0, 255, 0, 0.3)
 * - Invalid Color: Red tint rgba(255, 0, 0, 0.3)
 */

import { renderSprite } from './SpriteRenderer.js';

export interface GhostState {
  blueprintId: string;
  position: { x: number; y: number };
  rotation: number;
  isValid: boolean;
  width: number;
  height: number;
}

/**
 * Renders ghost building previews during placement mode.
 */
export class GhostRenderer {
  private readonly tileSize = 16;
  private readonly ghostOpacity = 0.6;
  private readonly validTint = 'rgba(0, 255, 0, 0.3)';
  private readonly invalidTint = 'rgba(255, 0, 0, 0.3)';

  /**
   * Render a ghost preview at the specified position.
   *
   * @param ctx Canvas rendering context
   * @param ghost Ghost state containing position, rotation, validity
   * @param screenX Screen X coordinate (after camera transform)
   * @param screenY Screen Y coordinate (after camera transform)
   * @param zoom Current camera zoom level
   */
  render(
    ctx: CanvasRenderingContext2D,
    ghost: GhostState,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const size = this.tileSize * zoom;

    // Handle rotation - swap width/height for 90/270 degree rotations
    let width = ghost.width;
    let height = ghost.height;
    if (ghost.rotation === 90 || ghost.rotation === 270) {
      [width, height] = [height, width];
    }

    // Save context state
    ctx.save();

    // Apply ghost opacity
    ctx.globalAlpha = this.ghostOpacity;

    // Render the building sprite at origin
    // For multi-tile buildings, we render a single sprite that spans the entire building
    this.renderBuildingSprite(
      ctx,
      ghost.blueprintId,
      screenX,
      screenY,
      size * width,
      size * height,
      ghost.rotation
    );

    // Apply validity tint overlay
    ctx.globalAlpha = 1;
    ctx.fillStyle = ghost.isValid ? this.validTint : this.invalidTint;
    ctx.fillRect(screenX, screenY, size * width, size * height);

    // Draw grid lines for occupied tiles
    ctx.strokeStyle = ghost.isValid
      ? 'rgba(0, 255, 0, 0.6)'
      : 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tileScreenX = screenX + dx * size;
        const tileScreenY = screenY + dy * size;
        ctx.strokeRect(tileScreenX, tileScreenY, size, size);
      }
    }

    // Draw rotation indicator (arrow showing front direction)
    if (ghost.rotation !== 0) {
      this.renderRotationIndicator(
        ctx,
        screenX + (size * width) / 2,
        screenY + (size * height) / 2,
        ghost.rotation,
        Math.min(size * width, size * height) / 4
      );
    }

    // Restore context state
    ctx.restore();
  }

  /**
   * Render the building sprite with rotation.
   */
  private renderBuildingSprite(
    ctx: CanvasRenderingContext2D,
    blueprintId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ): void {
    ctx.save();

    // Rotate around center
    if (rotation !== 0) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Map blueprint id to sprite id
    const spriteId = this.blueprintToSprite(blueprintId);

    // Render using existing sprite renderer
    renderSprite(ctx, spriteId, x, y, Math.min(width, height));

    ctx.restore();
  }

  /**
   * Map blueprint id to sprite id.
   */
  private blueprintToSprite(blueprintId: string): string {
    // Direct mapping for now (blueprint id matches sprite id)
    return blueprintId;
  }

  /**
   * Render rotation indicator arrow.
   */
  private renderRotationIndicator(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    rotation: number,
    size: number
  ): void {
    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw arrow pointing up (will be rotated by rotation angle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size); // Top point
    ctx.lineTo(-size / 2, size / 2); // Bottom left
    ctx.lineTo(0, 0); // Center
    ctx.lineTo(size / 2, size / 2); // Bottom right
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render a grid highlight at a position.
   * Used to show the grid during placement mode.
   */
  renderGridHighlight(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const size = this.tileSize * zoom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, size, size);
  }
}
