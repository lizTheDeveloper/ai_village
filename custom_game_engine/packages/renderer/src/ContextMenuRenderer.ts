/**
 * ContextMenuRenderer - Radial menu rendering
 *
 * Handles rendering of the radial context menu with items, animations,
 * hit testing, and visual feedback.
 */

import type { RadialMenuItem, AnimationStyle } from './context-menu/types.js';

/**
 * Renderer for radial context menus.
 */
export class ContextMenuRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    if (!ctx) {
      throw new Error('ContextMenuRenderer requires valid canvas context');
    }
    this.ctx = ctx;
  }

  /**
   * Calculate arc angles for menu items.
   */
  public calculateArcAngles(
    items: RadialMenuItem[],
    innerRadius: number,
    outerRadius: number,
    gap: number = 3
  ): RadialMenuItem[] {
    if (!items || items.length === 0) {
      throw new Error('calculateArcAngles requires non-empty items array');
    }
    if (innerRadius >= outerRadius) {
      throw new Error('calculateArcAngles requires innerRadius < outerRadius');
    }

    const itemCount = items.length;
    const totalGap = gap * itemCount;
    const arcPerItem = (360 - totalGap) / itemCount;

    return items.map((item, index) => {
      const startAngle = index * (arcPerItem + gap);
      const endAngle = startAngle + arcPerItem;

      return {
        ...item,
        startAngle,
        endAngle,
        innerRadius,
        outerRadius
      };
    });
  }

  /**
   * Render the radial menu.
   */
  public render(
    items: RadialMenuItem[],
    centerX: number,
    centerY: number
  ): void {
    if (items.length === 0) {
      return;
    }

    try {
      this.ctx.save();

      // NOTE: DO NOT call setTransform here - the main Renderer already applies ctx.scale(dpr, dpr)
      // and ctx.save() preserves that transform. Calling setTransform() would overwrite it.
      // Input coordinates (centerX, centerY) are already in logical pixels and will be scaled correctly.

      // Get radii from first item (all items should have same radii)
      const innerRadius = items[0]?.innerRadius ?? 30;
      const outerRadius = items[0]?.outerRadius ?? 100;

      // Draw menu background circle
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';  // Semi-transparent dark
      this.ctx.fill();

      // Draw menu border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';  // White border
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw inner circle (dead zone)
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';  // Darker center
      this.ctx.fill();

      // Draw items
      for (const item of items) {
        this.renderItem(item, centerX, centerY);
      }

      this.ctx.restore();
    } catch (error) {
      console.error('[ContextMenuRenderer] Exception during render:', error);
      throw error;
    }
  }

  /**
   * Render a single menu item.
   */
  private renderItem(
    item: RadialMenuItem,
    centerX: number,
    centerY: number
  ): void {
    if (item.startAngle === undefined || item.endAngle === undefined) return;
    if (item.innerRadius === undefined || item.outerRadius === undefined) return;

    this.ctx.save();

    // Translate to center
    this.ctx.translate(centerX, centerY);

    // Apply hover scale if needed
    if (item.hovered) {
      this.ctx.scale(1.1, 1.1);
    }

    // Draw arc segment
    const startRad = (item.startAngle * Math.PI) / 180;
    const endRad = (item.endAngle * Math.PI) / 180;

    // Background
    this.ctx.beginPath();
    this.ctx.arc(0, 0, item.outerRadius, startRad, endRad);
    this.ctx.arc(0, 0, item.innerRadius, endRad, startRad, true);
    this.ctx.closePath();

    // Fill color based on state
    if (!item.enabled) {
      this.ctx.fillStyle = 'rgba(136, 136, 136, 0.5)';
    } else if (item.hovered) {
      this.ctx.fillStyle = '#FFD700';
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    }
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Label
    const midAngle = (item.startAngle + item.endAngle) / 2;
    const midRadius = (item.innerRadius + item.outerRadius) / 2;
    const labelX = midRadius * Math.cos((midAngle * Math.PI) / 180);
    const labelY = midRadius * Math.sin((midAngle * Math.PI) / 180);

    this.ctx.fillStyle = item.enabled ? '#FFFFFF' : '#888888';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(item.label, labelX, labelY);

    // Icon (if available)
    if (item.icon) {
      // For now, just render a placeholder circle for icons
      const iconX = labelX;
      const iconY = labelY - 15;
      this.ctx.beginPath();
      this.ctx.arc(iconX, iconY, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fill();
    }

    // Shortcut (if available)
    if (item.shortcut) {
      const shortcutY = labelY + 12;
      this.ctx.font = '10px monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.fillText(`(${item.shortcut})`, labelX, shortcutY);
    }

    // Submenu indicator
    if (item.hasSubmenu) {
      const arrowX = labelX + item.label.length * 3;
      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('›', arrowX, labelY);
    }

    this.ctx.restore();
  }

  /**
   * Render connector line from menu to target.
   */
  public renderConnectorLine(
    menuX: number,
    menuY: number,
    targetX: number,
    targetY: number
  ): void {
    this.ctx.save();

    // NOTE: DO NOT call setTransform - main Renderer already applied ctx.scale(dpr, dpr)
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)'; // Semi-transparent gold
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(menuX, menuY);
    this.ctx.lineTo(targetX, targetY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render menu with open animation.
   */
  public renderOpenAnimation(
    items: RadialMenuItem[],
    centerX: number,
    centerY: number,
    style: AnimationStyle,
    progress: number
  ): void {
    this.ctx.save();

    // NOTE: DO NOT call setTransform - main Renderer already applied ctx.scale(dpr, dpr)
    switch (style) {
      case 'rotate_in':
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(((1 - progress) * 360 * Math.PI) / 180);
        this.ctx.translate(-centerX, -centerY);
        break;

      case 'scale':
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(progress, progress);
        this.ctx.translate(-centerX, -centerY);
        break;

      case 'fade':
        this.ctx.globalAlpha = progress;
        break;

      case 'pop':
        const scale = progress < 0.5 ? progress * 2.2 : 1 + (1 - progress) * 0.1;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-centerX, -centerY);
        break;
    }

    this.render(items, centerX, centerY);

    this.ctx.restore();
  }

  /**
   * Render menu with close animation.
   */
  public renderCloseAnimation(
    items: RadialMenuItem[],
    centerX: number,
    centerY: number,
    style: AnimationStyle,
    progress: number
  ): void {
    this.ctx.save();

    // NOTE: DO NOT call setTransform - main Renderer already applied ctx.scale(dpr, dpr)

    // Progress: 0 = start close, 1 = fully closed
    const reverseProgress = 1 - progress;

    switch (style) {
      case 'fade':
        this.ctx.globalAlpha = reverseProgress;
        break;

      case 'scale':
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(reverseProgress, reverseProgress);
        this.ctx.translate(-centerX, -centerY);
        break;

      default:
        this.ctx.globalAlpha = reverseProgress;
        break;
    }

    this.render(items, centerX, centerY);

    this.ctx.restore();
  }

  /**
   * Hit test - find which item was clicked.
   * Returns item ID or null.
   */
  public hitTest(
    items: RadialMenuItem[],
    menuX: number,
    menuY: number,
    clickX: number,
    clickY: number
  ): string | null {
    // Calculate distance and angle from menu center
    const dx = clickX - menuX;
    const dy = clickY - menuY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Normalize angle to 0-360
    if (angle < 0) angle += 360;

    for (const item of items) {
      if (item.innerRadius === undefined || item.outerRadius === undefined) continue;
      if (item.startAngle === undefined || item.endAngle === undefined) continue;

      // Check radius
      if (distance < item.innerRadius || distance > item.outerRadius) continue;

      // Check angle
      let startAngle = item.startAngle;
      let endAngle = item.endAngle;

      // Handle wrap-around
      if (startAngle > endAngle) {
        if (angle >= startAngle || angle <= endAngle) {
          return item.id;
        }
      } else {
        if (angle >= startAngle && angle <= endAngle) {
          return item.id;
        }
      }
    }

    return null;
  }

  /**
   * Adjust menu position to keep it fully on screen.
   */
  public adjustPositionForScreen(
    x: number,
    y: number,
    menuRadius: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    let adjustedX = x;
    let adjustedY = y;

    // Check right edge
    if (x + menuRadius > canvasWidth) {
      adjustedX = canvasWidth - menuRadius;
    }

    // Check left edge
    if (x - menuRadius < 0) {
      adjustedX = menuRadius;
    }

    // Check bottom edge
    if (y + menuRadius > canvasHeight) {
      adjustedY = canvasHeight - menuRadius;
    }

    // Check top edge
    if (y - menuRadius < 0) {
      adjustedY = menuRadius;
    }

    return { x: adjustedX, y: adjustedY };
  }
}
