import type { IWindowPanel } from '../types/WindowTypes.js';
import { InventoryUI } from '../ui/InventoryUI.js';

/**
 * Adapter to make InventoryUI compatible with WindowManager's IWindowPanel interface.
 */
export class InventoryUIAdapter implements IWindowPanel {
  private panel: InventoryUI;

  constructor(panel: InventoryUI) {
    if (!panel) {
      throw new Error('InventoryUI cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'inventory';
  }

  getTitle(): string {
    return 'Inventory';
  }

  getDefaultWidth(): number {
    return 800;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.panel.isOpen();
  }

  setVisible(visible: boolean): void {
    // InventoryUI manages its own open state via handleKeyPress
    // This is a modal panel, so visibility is toggled not set directly
    if (visible !== this.panel.isOpen()) {
      this.panel.handleKeyPress('KeyI', false, false);
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: any
  ): void {
    if (!this.isVisible()) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Call original render - it expects full canvas dimensions
    this.panel.render(ctx, width, height);

    ctx.restore();
  }

  /**
   * Handle click events on the panel.
   */
  handleClick(_x: number, _y: number): boolean {
    // InventoryUI has its own click handler
    // This would need canvas width/height which we don't have in the interface
    // For now, return false - click handling will be done separately
    return false;
  }

  /**
   * Get the underlying InventoryUI instance for direct access.
   */
  getPanel(): InventoryUI {
    return this.panel;
  }
}
