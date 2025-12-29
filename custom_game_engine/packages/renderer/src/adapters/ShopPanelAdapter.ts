import type { IWindowPanel } from '../types/WindowTypes.js';
import { ShopPanel } from '../ShopPanel.js';

/**
 * Adapter to make ShopPanel compatible with WindowManager's IWindowPanel interface.
 */
export class ShopPanelAdapter implements IWindowPanel {
  private panel: ShopPanel;

  constructor(panel: ShopPanel) {
    if (!panel) {
      throw new Error('ShopPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'shop';
  }

  getTitle(): string {
    return 'Shop';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.panel.isVisible();
  }

  setVisible(visible: boolean): void {
    if (!visible) {
      this.panel.close();
    }
    // Opening is handled via openShop method with shop/agent IDs
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    // ShopPanel renders itself with its own positioning (modal, centered)
    this.panel.render(ctx, world);
  }

  handleScroll(deltaY: number, _contentHeight: number): boolean {
    return this.panel.handleScroll(deltaY);
  }

  handleContentClick(_x: number, _y: number, _width: number, _height: number): boolean {
    // ShopPanel uses absolute canvas coordinates, so we need world
    // This will be called by InputHandler with canvas coordinates
    return false;
  }

  /**
   * Get the underlying ShopPanel instance for direct access.
   */
  getPanel(): ShopPanel {
    return this.panel;
  }
}
